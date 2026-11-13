/*
 * barrier -- mouse and keyboard sharing utility
 * Copyright (C) 2012-2016 Symless Ltd.
 * Copyright (C) 2026 Atharv KVM
 *
 * This package is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * found in the file LICENSE that should have accompanied this file.
 */

#include "barrier/ScreenCalibration.h"
#include "arch/Arch.h"
#include <chrono>
#include <iomanip>

ScreenCalibrationProfile::ScreenCalibrationProfile()
{
    reset();
}

void ScreenCalibrationProfile::reset()
{
    m_version = 1;
    m_enabled = false;
    m_scaleX = 1.0;
    m_scaleY = 1.0;
    m_offsetX = 0;
    m_offsetY = 0;
    m_srcWidth = 0;
    m_srcHeight = 0;
    m_dstWidth = 0;
    m_dstHeight = 0;
    m_backingScaleFactor = 2.0;
    m_displayName = "Default Display";
    m_timestamp = "none";
}

bool ScreenCalibrationProfile::isStale(SInt32 currentDstW, SInt32 currentDstH, double currentScale) const
{
    if (!m_enabled) {
        return false;
    }
    if (m_dstWidth > 0 && currentDstW > 0 && m_dstWidth != currentDstW) {
        return true;
    }
    if (m_dstHeight > 0 && currentDstH > 0 && m_dstHeight != currentDstH) {
        return true;
    }
    if (std::abs(m_backingScaleFactor - currentScale) > 0.01) {
        return true;
    }
    return false;
}

void ScreenCalibrationProfile::applyTransform(SInt32 inX, SInt32 inY, SInt32& outX, SInt32& outY) const
{
    if (!m_enabled) {
        outX = inX;
        outY = inY;
        return;
    }

    double tx = (static_cast<double>(inX) * m_scaleX) + static_cast<double>(m_offsetX);
    double ty = (static_cast<double>(inY) * m_scaleY) + static_cast<double>(m_offsetY);

    SInt32 calculatedX = static_cast<SInt32>(std::round(tx));
    SInt32 calculatedY = static_cast<SInt32>(std::round(ty));

    // Clamp within destination bounds if configured
    if (m_dstWidth > 0) {
        calculatedX = std::max<SInt32>(0, std::min<SInt32>(m_dstWidth - 1, calculatedX));
    }
    if (m_dstHeight > 0) {
        calculatedY = std::max<SInt32>(0, std::min<SInt32>(m_dstHeight - 1, calculatedY));
    }

    outX = calculatedX;
    outY = calculatedY;
}

std::string ScreenCalibrationProfile::serialize() const
{
    std::ostringstream ss;
    ss << m_version << "|"
       << (m_enabled ? 1 : 0) << "|"
       << std::fixed << std::setprecision(6) << m_scaleX << "|"
       << m_scaleY << "|"
       << m_offsetX << "|"
       << m_offsetY << "|"
       << m_srcWidth << "|"
       << m_srcHeight << "|"
       << m_dstWidth << "|"
       << m_dstHeight << "|"
       << std::setprecision(2) << m_backingScaleFactor << "|"
       << m_displayName << "|"
       << m_timestamp;
    return ss.str();
}

bool ScreenCalibrationProfile::deserialize(const std::string& data)
{
    if (data.empty()) {
        return false;
    }

    std::istringstream ss(data);
    std::string token;
    std::vector<std::string> tokens;
    while (std::getline(ss, token, '|')) {
        tokens.push_back(token);
    }

    if (tokens.size() < 13) {
        return false;
    }

    try {
        m_version = static_cast<UInt16>(std::stoi(tokens[0]));
        m_enabled = (std::stoi(tokens[1]) != 0);
        m_scaleX = std::stod(tokens[2]);
        m_scaleY = std::stod(tokens[3]);
        m_offsetX = static_cast<SInt16>(std::stoi(tokens[4]));
        m_offsetY = static_cast<SInt16>(std::stoi(tokens[5]));
        m_srcWidth = std::stoi(tokens[6]);
        m_srcHeight = std::stoi(tokens[7]);
        m_dstWidth = std::stoi(tokens[8]);
        m_dstHeight = std::stoi(tokens[9]);
        m_backingScaleFactor = std::stod(tokens[10]);
        m_displayName = tokens[11];
        m_timestamp = tokens[12];
        return true;
    } catch (...) {
        return false;
    }
}

//
// JitterAnalyzer
//

JitterAnalyzer::JitterAnalyzer()
    : m_totalSamples(0),
      m_duplicateCount(0),
      m_jumpCount(0),
      m_maxJumpDelta(0.0),
      m_consecutiveDuplicates(0)
{
}

void JitterAnalyzer::reset()
{
    std::lock_guard<std::mutex> lock(m_mutex);
    m_history.clear();
    m_totalSamples = 0;
    m_duplicateCount = 0;
    m_jumpCount = 0;
    m_maxJumpDelta = 0.0;
    m_consecutiveDuplicates = 0;
}

void JitterAnalyzer::recordSample(SInt32 x, SInt32 y, const char* tag)
{
    std::lock_guard<std::mutex> lock(m_mutex);

    auto now = std::chrono::steady_clock::now();
    double nowMs = std::chrono::duration<double, std::milli>(now.time_since_epoch()).count();

    m_totalSamples++;

    if (!m_history.empty()) {
        const auto& prev = m_history.back();
        SInt32 dx = x - prev.x;
        SInt32 dy = y - prev.y;
        double dt = nowMs - prev.timestampMs;
        double dist = std::sqrt(static_cast<double>(dx * dx + dy * dy));

        if (dx == 0 && dy == 0) {
            m_duplicateCount++;
            m_consecutiveDuplicates++;
            if (m_consecutiveDuplicates >= 5) {
                LOG((CLOG_DEBUG1 "[JITTER] Duplicate coordinate detected (%d, %d) count=%d tag=%s",
                     x, y, m_consecutiveDuplicates, tag));
            }
        } else {
            m_consecutiveDuplicates = 0;
        }

        if (dist > m_maxJumpDelta) {
            m_maxJumpDelta = dist;
        }

        // Detect suspicious quantization jumps: > 60px displacement in < 25ms
        if (dist > 60.0 && dt < 25.0 && dt > 0.0) {
            m_jumpCount++;
            LOG((CLOG_WARN "[JITTER] Quantized jump detected: delta=(%+d, %+d) dist=%.1f px in %.1f ms tag=%s",
                 dx, dy, dist, dt, tag));
        }
    }

    m_history.push_back({x, y, nowMs});
    if (m_history.size() > 200) {
        m_history.pop_front();
    }
}

//
// ScreenCalibrationManager
//

ScreenCalibrationManager::ScreenCalibrationManager()
    : m_activeSessionSeq(0)
{
    LOG((CLOG_INFO "[CALIBRATION] initialization: manager ready"));
}

ScreenCalibrationManager::~ScreenCalibrationManager()
{
    LOG((CLOG_INFO "[CALIBRATION] session destroyed: manager shut down"));
}

ScreenCalibrationManager& ScreenCalibrationManager::getInstance()
{
    static ScreenCalibrationManager s_instance;
    return s_instance;
}

void ScreenCalibrationManager::setProfile(const ScreenCalibrationProfile& profile)
{
    std::lock_guard<std::mutex> lock(m_mutex);
    m_profile = profile;
    LOG((CLOG_INFO "[CALIBRATION] completed: profile applied scale=(%.4f, %.4f) offset=(%d, %d) src=%dx%d dst=%dx%d enabled=%d",
         profile.m_scaleX, profile.m_scaleY, profile.m_offsetX, profile.m_offsetY,
         profile.m_srcWidth, profile.m_srcHeight, profile.m_dstWidth, profile.m_dstHeight,
         profile.m_enabled ? 1 : 0));
}

void ScreenCalibrationManager::reset()
{
    std::lock_guard<std::mutex> lock(m_mutex);
    m_profile.reset();
    m_activeSessionSeq = 0;
    m_pointRecords.clear();
    m_testRecords.clear();
    m_jitterAnalyzer.reset();
    LOG((CLOG_INFO "[CALIBRATION] reset: reverting to uncalibrated coordinate path"));
}

void ScreenCalibrationManager::startCalibrationSession(UInt32 seq)
{
    std::lock_guard<std::mutex> lock(m_mutex);
    m_activeSessionSeq = seq;
    m_pointRecords.clear();
    LOG((CLOG_INFO "[CALIBRATION] session created: sequence=%u", seq));
}

void ScreenCalibrationManager::cancelCalibrationSession(UInt32 seq)
{
    std::lock_guard<std::mutex> lock(m_mutex);
    UInt32 cancelledSeq = (seq != 0) ? seq : m_activeSessionSeq;
    m_activeSessionSeq = 0;
    LOG((CLOG_INFO "[CALIBRATION] cancelled: sequence=%u", cancelledSeq));
}

void ScreenCalibrationManager::recordPoint(UInt32 seq, UInt16 pointIdx, SInt16 srcX, SInt16 srcY,
                                          SInt16 expX, SInt16 expY, SInt16 measuredX, SInt16 measuredY)
{
    std::lock_guard<std::mutex> lock(m_mutex);
    CalibrationPointRecord rec;
    rec.seq = seq;
    rec.pointIndex = pointIdx;
    rec.srcX = srcX;
    rec.srcY = srcY;
    rec.expectedNormX = expX;
    rec.expectedNormY = expY;
    rec.measuredX = measuredX;
    rec.measuredY = measuredY;
    auto nowSec = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    rec.timestamp = static_cast<UInt32>(nowSec);
    m_pointRecords.push_back(rec);

    LOG((CLOG_INFO "[CALIBRATION] point recorded: seq=%u idx=%u src=(%d,%d) exp=(%d,%d) measured=(%d,%d)",
         seq, pointIdx, srcX, srcY, expX, expY, measuredX, measuredY));
}

void ScreenCalibrationManager::recordTestPoint(UInt32 seq, UInt16 pointIdx, SInt16 targetX, SInt16 targetY,
                                              SInt16 measuredX, SInt16 measuredY)
{
    std::lock_guard<std::mutex> lock(m_mutex);
    CalibrationTestRecord rec;
    rec.seq = seq;
    rec.pointIndex = pointIdx;
    rec.targetX = targetX;
    rec.targetY = targetY;
    rec.measuredX = measuredX;
    rec.measuredY = measuredY;
    rec.errorX = measuredX - targetX;
    rec.errorY = measuredY - targetY;
    rec.passed = (std::abs(rec.errorX) <= 4 && std::abs(rec.errorY) <= 4);
    m_testRecords.push_back(rec);

    LOG((CLOG_INFO "[CALIBRATION] test point recorded: seq=%u idx=%u target=(%d,%d) measured=(%d,%d) err=(%+d,%+d) result=%s",
         seq, pointIdx, targetX, targetY, measuredX, measuredY, rec.errorX, rec.errorY,
         rec.passed ? "PASS" : "FAIL"));
}

void ScreenCalibrationManager::logDisplayGeometry(const std::string& name, SInt32 logW, SInt32 logH, double scale, SInt32 physW, SInt32 physH)
{
    LOG((CLOG_INFO "[CALIBRATION] display geometry: name=%s logical=%dx%d scale=%.2f physical=%dx%d",
         name.c_str(), logW, logH, scale, physW, physH));
}

void ScreenCalibrationManager::logAccessibilityStatus(bool granted)
{
    LOG((CLOG_INFO "[CALIBRATION] accessibility status: %s",
         granted ? "GRANTED" : "NOT GRANTED"));
}

void ScreenCalibrationManager::logSampleCount()
{
    std::lock_guard<std::mutex> lock(m_mutex);
    LOG((CLOG_INFO "[CALIBRATION] sample count: total=%llu duplicates=%llu jumps=%llu maxDelta=%.1f",
         m_jitterAnalyzer.getTotalSamples(),
         m_jitterAnalyzer.getDuplicateCount(),
         m_jitterAnalyzer.getJumpCount(),
         m_jitterAnalyzer.getMaxJumpDelta()));
}
