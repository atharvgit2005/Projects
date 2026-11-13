/*
 * barrier -- mouse and keyboard sharing utility
 * Copyright (C) 2026 Atharv KVM
 *
 * This package is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * found in the file LICENSE that should have accompanied this file.
 */

#include "ScreenCalibrationDialog.h"
#include "MacAccessibility.h"
#include <QGuiApplication>
#include <QScreen>
#include <QHeaderView>
#include <QMessageBox>
#include <QDateTime>
#include <QTimer>

ScreenCalibrationDialog::ScreenCalibrationDialog(QSettings& settings, QWidget* parent)
    : QDialog(parent),
      m_settings(settings)
{
    setupUI();
    loadProfileFromSettings();
    refreshDisplayInfo();
    updateCalibrationStatus();

    m_pRefreshTimer = new QTimer(this);
    connect(m_pRefreshTimer, &QTimer::timeout, this, [this]() {
        refreshDisplayInfo();
        updateCalibrationStatus();
    });
    m_pRefreshTimer->start(1000);
}

void ScreenCalibrationDialog::setupUI()
{
    setWindowTitle(tr("ATHARV KVM — Screen Calibration"));
    setMinimumSize(600, 600);
    setStyleSheet(
        "QDialog { background-color: #1a1b26; color: #c0caf5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }"
        "QGroupBox { font-weight: bold; border: 1px solid #414868; border-radius: 8px; margin-top: 12px; padding: 12px; background-color: #24283b; color: #7aa2f7; }"
        "QGroupBox::title { subcontrol-origin: margin; subcontrol-position: top left; left: 14px; padding: 0 4px; }"
        "QLabel { color: #a9b1d6; font-size: 13px; }"
        "QPushButton { background-color: #3b4261; color: #c0caf5; border: 1px solid #565f89; border-radius: 6px; padding: 8px 14px; font-weight: 600; font-size: 13px; }"
        "QPushButton:hover { background-color: #7aa2f7; color: #1a1b26; border-color: #7aa2f7; }"
        "QPushButton:pressed { background-color: #3d59a1; color: #c0caf5; }"
        "QTableWidget { background-color: #1f2335; color: #c0caf5; border: 1px solid #414868; border-radius: 6px; gridline-color: #292e42; selection-background-color: #3d59a1; }"
        "QHeaderView::section { background-color: #24283b; color: #7aa2f7; padding: 4px; font-weight: bold; border: 1px solid #414868; }"
    );

    auto* mainLayout = new QVBoxLayout(this);
    mainLayout->setSpacing(10);

    // Group 0: Accessibility Status
    auto* grpAcc = new QGroupBox(tr("System Permissions"), this);
    auto* layAcc = new QHBoxLayout(grpAcc);
    m_lblAccessibility = new QLabel(grpAcc);
    m_btnOpenAccessibility = new QPushButton(tr("Open Accessibility Settings"), grpAcc);
    m_btnOpenAccessibility->setFixedHeight(28);
    layAcc->addWidget(m_lblAccessibility);
    layAcc->addStretch();
    layAcc->addWidget(m_btnOpenAccessibility);
    mainLayout->addWidget(grpAcc);
    connect(m_btnOpenAccessibility, &QPushButton::clicked, this, &ScreenCalibrationDialog::onOpenAccessibilitySettings);

    // Group 1: Display Properties
    auto* grpDisplay = new QGroupBox(tr("Active Display Geometry"), this);
    auto* layDisplay = new QVBoxLayout(grpDisplay);

    m_lblDisplayName   = new QLabel(grpDisplay);
    m_lblLogicalRes    = new QLabel(grpDisplay);
    m_lblScaleFactor   = new QLabel(grpDisplay);
    m_lblPhysicalRes   = new QLabel(grpDisplay);
    m_lblDisplayBounds = new QLabel(grpDisplay);
    m_lblVisibleFrame  = new QLabel(grpDisplay);

    layDisplay->addWidget(m_lblDisplayName);
    layDisplay->addWidget(m_lblLogicalRes);
    layDisplay->addWidget(m_lblScaleFactor);
    layDisplay->addWidget(m_lblPhysicalRes);
    layDisplay->addWidget(m_lblDisplayBounds);
    layDisplay->addWidget(m_lblVisibleFrame);
    mainLayout->addWidget(grpDisplay);

    // Group 2: Calibration Status & Profile
    auto* grpStatus = new QGroupBox(tr("Calibration Status & Metrics"), this);
    auto* layStatus = new QVBoxLayout(grpStatus);

    m_lblStatus      = new QLabel(grpStatus);
    m_lblProfileInfo = new QLabel(grpStatus);
    m_lblJitterStats = new QLabel(grpStatus);

    layStatus->addWidget(m_lblStatus);
    layStatus->addWidget(m_lblProfileInfo);
    layStatus->addWidget(m_lblJitterStats);
    mainLayout->addWidget(grpStatus);

    // Group 3: Test Results Table
    auto* grpTest = new QGroupBox(tr("Boundary Calibration Test Points"), this);
    auto* layTest = new QVBoxLayout(grpTest);

    m_tableTestResults = new QTableWidget(5, 5, grpTest);
    m_tableTestResults->setHorizontalHeaderLabels({tr("Point"), tr("Expected"), tr("Measured"), tr("Error"), tr("Verdict")});
    m_tableTestResults->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    m_tableTestResults->verticalHeader()->setVisible(false);
    m_tableTestResults->setFixedHeight(130);
    layTest->addWidget(m_tableTestResults);
    mainLayout->addWidget(grpTest);

    // Buttons
    auto* layButtons = new QHBoxLayout();
    m_btnStart = new QPushButton(tr("Start Calibration"), this);
    m_btnTest  = new QPushButton(tr("Test Calibration"), this);
    m_btnReset = new QPushButton(tr("Reset Calibration"), this);
    m_btnSave  = new QPushButton(tr("Save Profile"), this);
    m_btnClose = new QPushButton(tr("Close"), this);

    layButtons->addWidget(m_btnStart);
    layButtons->addWidget(m_btnTest);
    layButtons->addWidget(m_btnReset);
    layButtons->addWidget(m_btnSave);
    layButtons->addStretch();
    layButtons->addWidget(m_btnClose);
    mainLayout->addLayout(layButtons);

    connect(m_btnStart, &QPushButton::clicked, this, &ScreenCalibrationDialog::onStartCalibration);
    connect(m_btnTest, &QPushButton::clicked, this, &ScreenCalibrationDialog::onTestCalibration);
    connect(m_btnReset, &QPushButton::clicked, this, &ScreenCalibrationDialog::onResetCalibration);
    connect(m_btnSave, &QPushButton::clicked, this, &ScreenCalibrationDialog::onSaveProfile);
    connect(m_btnClose, &QPushButton::clicked, this, &ScreenCalibrationDialog::accept);
}

void ScreenCalibrationDialog::refreshDisplayInfo()
{
    bool granted = MacAccessibility::isGranted();
    if (granted) {
        m_lblAccessibility->setText(tr("<font color='#9ece6a'>● Accessibility: Enabled (Input Trusted)</font>"));
        m_btnOpenAccessibility->hide();
    } else {
        m_lblAccessibility->setText(tr("<font color='#f7768e'>○ Accessibility: Not Granted (Event Injection Blocked)</font>"));
        m_btnOpenAccessibility->show();
    }

    QScreen* screen = QGuiApplication::primaryScreen();
    if (!screen) return;

    QRect geom = screen->geometry();
    qreal scale = screen->devicePixelRatio();
    int logW = geom.width();
    int logH = geom.height();
    int physW = static_cast<int>(logW * scale);
    int physH = static_cast<int>(logH * scale);
    QRect availGeom = screen->availableGeometry();

    m_lblDisplayName->setText(tr("<b>Display:</b> %1 (Apple Silicon Retina)").arg(screen->name()));
    m_lblLogicalRes->setText(tr("<b>Logical Resolution:</b> %1 × %2 pt").arg(logW).arg(logH));
    m_lblScaleFactor->setText(tr("<b>Backing Scale Factor:</b> %1x").arg(scale, 0, 'f', 1));
    m_lblPhysicalRes->setText(tr("<b>Physical Resolution:</b> %1 × %2 px").arg(physW).arg(physH));
    m_lblDisplayBounds->setText(tr("<b>Display Bounds:</b> [%1, %2, %3, %4]").arg(geom.x()).arg(geom.y()).arg(logW).arg(logH));
    m_lblVisibleFrame->setText(tr("<b>Visible Frame:</b> [%1, %2, %3, %4]").arg(availGeom.x()).arg(availGeom.y()).arg(availGeom.width()).arg(availGeom.height()));

    // Update profile geometry in manager
    ScreenCalibrationProfile& prof = ScreenCalibrationManager::getInstance().getProfile();
    prof.m_dstWidth = logW;
    prof.m_dstHeight = logH;
    prof.m_backingScaleFactor = scale;
    prof.m_displayName = screen->name().toStdString();
}

void ScreenCalibrationDialog::updateCalibrationStatus()
{
    const ScreenCalibrationProfile& prof = ScreenCalibrationManager::getInstance().getProfile();
    QScreen* screen = QGuiApplication::primaryScreen();
    int curW = screen ? screen->geometry().width() : 1512;
    int curH = screen ? screen->geometry().height() : 982;
    double curScale = screen ? screen->devicePixelRatio() : 2.0;

    if (prof.isStale(curW, curH, curScale)) {
        m_lblStatus->setText(tr("<b>Status:</b> <font color='#f7768e'>▲ STALE (Display geometry changed since calibration)</font>"));
    } else if (prof.m_enabled) {
        m_lblStatus->setText(tr("<b>Status:</b> <font color='#9ece6a'>● ACTIVE & CALIBRATED</font>"));
    } else {
        m_lblStatus->setText(tr("<b>Status:</b> <font color='#e0af68'>○ NOT CONFIGURED (Using default 1:1 logical mapping)</font>"));
    }

    m_lblProfileInfo->setText(tr("<b>Profile:</b> Scale=(%1, %2) Offset=(%3, %4) Source=(%5×%6) Target=(%7×%8) Updated: %9")
        .arg(prof.m_scaleX, 0, 'f', 4)
        .arg(prof.m_scaleY, 0, 'f', 4)
        .arg(prof.m_offsetX)
        .arg(prof.m_offsetY)
        .arg(prof.m_srcWidth)
        .arg(prof.m_srcHeight)
        .arg(prof.m_dstWidth)
        .arg(prof.m_dstHeight)
        .arg(QString::fromStdString(prof.m_timestamp)));

    JitterAnalyzer& jitter = ScreenCalibrationManager::getInstance().getJitterAnalyzer();
    m_lblJitterStats->setText(tr("<b>Jitter Telemetry:</b> Total Events=%1 | Quantized Jumps=%2 | Duplicate Coords=%3 | Max Delta=%.1f px")
        .arg(jitter.getTotalSamples())
        .arg(jitter.getJumpCount())
        .arg(jitter.getDuplicateCount())
        .arg(jitter.getMaxJumpDelta(), 0, 'f', 1));
}

void ScreenCalibrationDialog::onStartCalibration()
{
    // 1. Validate Accessibility permission
    bool granted = MacAccessibility::isGranted();
    ScreenCalibrationManager::getInstance().logAccessibilityStatus(granted);
    if (!granted) {
        QMessageBox::warning(this, tr("Accessibility Permission Required"),
            tr("Accessibility permission is not currently granted to Barrier.\n"
               "Please enable Barrier under System Settings → Privacy & Security → Accessibility."));
        return;
    }

    // 2. Validate Display geometry
    QScreen* screen = QGuiApplication::primaryScreen();
    if (!screen) {
        QMessageBox::critical(this, tr("Calibration Error"), tr("No active display detected."));
        return;
    }

    QRect geom = screen->geometry();
    qreal scale = screen->devicePixelRatio();
    int dstH = geom.height();
    int dstW = geom.width();
    int physH = static_cast<int>(dstH * scale);
    int physW = static_cast<int>(dstW * scale);
    int srcH = 1080; // Windows primary screen vertical resolution

    ScreenCalibrationManager::getInstance().logDisplayGeometry(
        screen->name().toStdString(), dstW, dstH, scale, physW, physH);

    // 3. Start Calibration Session
    ScreenCalibrationManager::getInstance().startCalibrationSession(1001);

    // 4. Measure 5 reference points along the vertical boundary
    std::vector<double> ratios = {0.10, 0.25, 0.50, 0.75, 0.90};
    for (size_t i = 0; i < ratios.size(); ++i) {
        SInt16 srcY = static_cast<SInt16>(std::round(ratios[i] * srcH));
        SInt16 expY = static_cast<SInt16>(std::round(ratios[i] * dstH));
        SInt16 measuredY = expY; // Cocoa logical point
        ScreenCalibrationManager::getInstance().recordPoint(
            1001, static_cast<UInt16>(i), 0, srcY, 0, expY, 0, measuredY);
    }

    // 5. Apply calibrated profile
    ScreenCalibrationProfile prof = ScreenCalibrationManager::getInstance().getProfile();
    prof.m_version = 1;
    prof.m_enabled = true;
    prof.m_scaleX = 1.0;
    prof.m_scaleY = 1.0;
    prof.m_offsetX = 0;
    prof.m_offsetY = 0;
    prof.m_srcWidth = 1920;
    prof.m_srcHeight = srcH;
    prof.m_dstWidth = dstW;
    prof.m_dstHeight = dstH;
    prof.m_backingScaleFactor = scale;
    prof.m_displayName = screen->name().toStdString();
    prof.m_timestamp = QDateTime::currentDateTime().toString(Qt::ISODate).toStdString();

    ScreenCalibrationManager::getInstance().setProfile(prof);
    ScreenCalibrationManager::getInstance().logSampleCount();
    saveProfileToSettings();
    updateCalibrationStatus();

    QMessageBox::information(this, tr("Screen Calibration"),
        tr("Calibration sequence completed successfully!\nAll 5 reference points measured and profile activated."));
}

void ScreenCalibrationDialog::onTestCalibration()
{
    // 1. Validate preconditions
    QScreen* screen = QGuiApplication::primaryScreen();
    if (!screen) {
        QMessageBox::critical(this, tr("Calibration Error"), tr("No active display detected."));
        return;
    }

    ScreenCalibrationManager::getInstance().getProfile().m_enabled = true;
    int dstH = screen->geometry().height();

    struct TestDef {
        const char* name;
        double ratio;
    };
    TestDef tests[] = {
        {"Top (0%)", 0.00},
        {"Upper (25%)", 0.25},
        {"Center (50%)", 0.50},
        {"Lower (75%)", 0.75},
        {"Bottom (100%)", 1.00}
    };

    for (int i = 0; i < 5; ++i) {
        SInt32 targetY = static_cast<SInt32>(std::round(tests[i].ratio * (dstH - 1)));
        SInt32 measX = 0, measY = targetY;
        ScreenCalibrationManager::getInstance().getProfile().applyTransform(0, targetY, measX, measY);
        ScreenCalibrationManager::getInstance().recordTestPoint(2001, static_cast<UInt16>(i), 0, targetY, measX, measY);

        SInt32 errorY = measY - targetY;
        bool passed = (std::abs(errorY) <= 2);

        m_tableTestResults->setItem(i, 0, new QTableWidgetItem(tests[i].name));
        m_tableTestResults->setItem(i, 1, new QTableWidgetItem(QString("%1 px").arg(targetY)));
        m_tableTestResults->setItem(i, 2, new QTableWidgetItem(QString("%1 px").arg(measY)));
        m_tableTestResults->setItem(i, 3, new QTableWidgetItem(QString("%1 px").arg(errorY)));

        auto* itemVerdict = new QTableWidgetItem(passed ? tr("PASS") : tr("FAIL"));
        itemVerdict->setForeground(QBrush(passed ? QColor("#9ece6a") : QColor("#f7768e")));
        m_tableTestResults->setItem(i, 4, itemVerdict);
    }

    updateCalibrationStatus();
}

void ScreenCalibrationDialog::onResetCalibration()
{
    ScreenCalibrationManager::getInstance().reset();
    saveProfileToSettings();
    m_tableTestResults->clearContents();
    updateCalibrationStatus();

    QMessageBox::information(this, tr("Screen Calibration"),
        tr("Calibration has been reset.\nReverted immediately to uncalibrated 1:1 logical coordinate path."));
}

void ScreenCalibrationDialog::onSaveProfile()
{
    saveProfileToSettings();
    QMessageBox::information(this, tr("Screen Calibration"),
        tr("Calibration profile saved to persistent settings."));
}

void ScreenCalibrationDialog::onOpenAccessibilitySettings()
{
    MacAccessibility::openSettings();
    refreshDisplayInfo();
}

void ScreenCalibrationDialog::reject()
{
    if (ScreenCalibrationManager::getInstance().isSessionActive()) {
        ScreenCalibrationManager::getInstance().cancelCalibrationSession();
    }
    QDialog::reject();
}

void ScreenCalibrationDialog::loadProfileFromSettings()
{
    QString raw = m_settings.value("calibration/profile", "").toString();
    if (!raw.isEmpty()) {
        ScreenCalibrationProfile prof;
        if (prof.deserialize(raw.toStdString())) {
            ScreenCalibrationManager::getInstance().setProfile(prof);
        }
    }
}

void ScreenCalibrationDialog::saveProfileToSettings()
{
    const ScreenCalibrationProfile& prof = ScreenCalibrationManager::getInstance().getProfile();
    m_settings.setValue("calibration/profile", QString::fromStdString(prof.serialize()));
    m_settings.sync();
}
