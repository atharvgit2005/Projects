/*
 * barrier -- mouse and keyboard sharing utility
 * Copyright (C) 2026 Atharv KVM
 *
 * This package is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * found in the file LICENSE that should have accompanied this file.
 */

#pragma once

#include <QDialog>
#include <QLabel>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGroupBox>
#include <QSettings>
#include "barrier/ScreenCalibration.h"

class ScreenCalibrationDialog : public QDialog
{
    Q_OBJECT

public:
    explicit ScreenCalibrationDialog(QSettings& settings, QWidget* parent = nullptr);
    ~ScreenCalibrationDialog() override = default;

    void refreshDisplayInfo();
    void updateCalibrationStatus();
    void reject() override;

private slots:
    void onStartCalibration();
    void onTestCalibration();
    void onResetCalibration();
    void onSaveProfile();
    void onOpenAccessibilitySettings();

private:
    void setupUI();
    void loadProfileFromSettings();
    void saveProfileToSettings();

    QSettings& m_settings;

    // Display & Accessibility labels
    QLabel* m_lblAccessibility;
    QPushButton* m_btnOpenAccessibility;
    QLabel* m_lblDisplayName;
    QLabel* m_lblLogicalRes;
    QLabel* m_lblScaleFactor;
    QLabel* m_lblPhysicalRes;
    QLabel* m_lblDisplayBounds;
    QLabel* m_lblVisibleFrame;
    QLabel* m_lblStatus;
    QLabel* m_lblProfileInfo;
    QLabel* m_lblJitterStats;

    // Action buttons
    QPushButton* m_btnStart;
    QPushButton* m_btnTest;
    QPushButton* m_btnReset;
    QPushButton* m_btnSave;
    QPushButton* m_btnClose;

    // Test results table
    QTableWidget* m_tableTestResults;

    QTimer* m_pRefreshTimer = nullptr;
};
