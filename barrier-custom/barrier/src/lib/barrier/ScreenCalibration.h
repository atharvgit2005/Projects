/*
 * barrier -- mouse and keyboard sharing utility
 * Copyright (C) 2012-2016 Symless Ltd.
 * Copyright (C) 2026 Atharv KVM
 *
 * This package is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * found in the file LICENSE that should have accompanied this file.
 */

#pragma once

#include "common/stdvector.h"
#include "common/stdstring.h"
#include "arch/Arch.h"
#include "base/Log.h"
#include <deque>
#include <mutex>
#include <sstream>
#include <cmath>
#include <algorithm>

struct CalibrationPointRecord {
    UInt32 seq;
    UInt16 pointIndex;
    SInt16 srcX;
    SInt16 srcY;
    SInt16 expectedNormX;
    SInt16 expectedNormY;
    SInt16 measuredX;
    SInt16 measuredY;
    UInt32 timestamp;
};

struct CalibrationTestRecord {
    UInt32 seq;
    UInt16 pointIndex;
    SInt16 targetX;
    SInt16 targetY;
    SInt16 measuredX;
    SInt16 measuredY;
    SInt16 errorX;
    SInt16 errorY;
    bool passed;
};

class ScreenCalibrationProfile {
public:
    ScreenCalibrationProfile();

    UInt16      m_version;
    bool        m_enabled;
    double      m_scaleX;
    double      m_scaleY;
    SInt16      m_offsetX;
    SInt16      m_offsetY;
    SInt32      m_srcWidth;
    SInt32      m_srcHeight;
    SInt32      m_dstWidth;
    SInt32      m_dstHeight;
    double      m_backingScaleFactor;
    std::string m_displayName;
    std::string m_timestamp;

    bool isStale(SInt32 currentDstW, SInt32 currentDstH, double currentScale) const;
    void applyTransform(SInt32 inX, SInt32 inY, SInt32& outX, SInt32& outY) const;
    std::string serialize() const;
    bool deserialize(const std::string& data);
    void reset();
};

class JitterAnalyzer {
public:
    struct MotionSample {
        SInt32 x;
        SInt32 y;
        double timestampMs;
    };

    JitterAnalyzer();

    void recordSample(SInt32 x, SInt32 y, const char* tag = "cursor");
    void reset();

    UInt64 getDuplicateCount() const { return m_duplicateCount; }
    UInt64 getJumpCount() const { return m_jumpCount; }
    UInt64 getTotalSamples() const { return m_totalSamples; }
    double getMaxJumpDelta() const { return m_maxJumpDelta; }

private:
    std::deque<MotionSample> m_history;
    UInt64 m_totalSamples;
    UInt64 m_duplicateCount;
    UInt64 m_jumpCount;
    double m_maxJumpDelta;
    SInt32 m_consecutiveDuplicates;
    mutable std::mutex m_mutex;
};

class ScreenCalibrationManager {
public:
    static ScreenCalibrationManager& getInstance();

    ScreenCalibrationProfile& getProfile() { return m_profile; }
    const ScreenCalibrationProfile& getProfile() const { return m_profile; }
    void setProfile(const ScreenCalibrationProfile& profile);

    bool isEnabled() const { return m_profile.m_enabled; }
    void setEnabled(bool enabled) { m_profile.m_enabled = enabled; }
    void reset();

    // Calibration session
    void startCalibrationSession(UInt32 seq);
    void cancelCalibrationSession(UInt32 seq = 0);
    bool isSessionActive() const { return m_activeSessionSeq != 0; }
    UInt32 getActiveSessionSeq() const { return m_activeSessionSeq; }
    void recordPoint(UInt32 seq, UInt16 pointIdx, SInt16 srcX, SInt16 srcY,
                     SInt16 expX, SInt16 expY, SInt16 measuredX, SInt16 measuredY);
    const std::vector<CalibrationPointRecord>& getPointRecords() const { return m_pointRecords; }

    // Test session
    void recordTestPoint(UInt32 seq, UInt16 pointIdx, SInt16 targetX, SInt16 targetY,
                         SInt16 measuredX, SInt16 measuredY);
    const std::vector<CalibrationTestRecord>& getTestRecords() const { return m_testRecords; }

    // Diagnostics
    void logDisplayGeometry(const std::string& name, SInt32 logW, SInt32 logH, double scale, SInt32 physW, SInt32 physH);
    void logAccessibilityStatus(bool granted);
    void logSampleCount();

    JitterAnalyzer& getJitterAnalyzer() { return m_jitterAnalyzer; }

private:
    ScreenCalibrationManager();
    ~ScreenCalibrationManager();

    ScreenCalibrationProfile m_profile;
    UInt32 m_activeSessionSeq;
    std::vector<CalibrationPointRecord> m_pointRecords;
    std::vector<CalibrationTestRecord> m_testRecords;
    JitterAnalyzer m_jitterAnalyzer;
    mutable std::mutex m_mutex;
};
