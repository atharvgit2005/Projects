/*
 * barrier -- mouse and keyboard sharing utility
 * Copyright (C) 2026 Atharv KVM
 *
 * This package is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * found in the file LICENSE that should have accompanied this file.
 */

#include "barrier/ScreenCalibration.h"
#include <gtest/gtest.h>

class ScreenCalibrationTest : public ::testing::Test {
protected:
    void SetUp() override {
        ScreenCalibrationManager::getInstance().reset();
    }

    void TearDown() override {
        ScreenCalibrationManager::getInstance().reset();
    }
};

TEST_F(ScreenCalibrationTest, DefaultProfileUncalibrated)
{
    ScreenCalibrationProfile prof;
    EXPECT_FALSE(prof.m_enabled);
    EXPECT_DOUBLE_EQ(prof.m_scaleX, 1.0);
    EXPECT_DOUBLE_EQ(prof.m_scaleY, 1.0);
    EXPECT_EQ(prof.m_offsetX, 0);
    EXPECT_EQ(prof.m_offsetY, 0);

    SInt32 outX = -1, outY = -1;
    prof.applyTransform(500, 300, outX, outY);
    EXPECT_EQ(outX, 500);
    EXPECT_EQ(outY, 300);
}

TEST_F(ScreenCalibrationTest, ProfileSerializationDeserialization)
{
    ScreenCalibrationProfile original;
    original.m_version = 1;
    original.m_enabled = true;
    original.m_scaleX = 1.045678;
    original.m_scaleY = 0.987654;
    original.m_offsetX = 5;
    original.m_offsetY = -12;
    original.m_srcWidth = 1920;
    original.m_srcHeight = 1080;
    original.m_dstWidth = 1512;
    original.m_dstHeight = 982;
    original.m_backingScaleFactor = 2.0;
    original.m_displayName = "MacBook Pro Liquid Retina";
    original.m_timestamp = "2026-08-23T19:00:00Z";

    std::string serialized = original.serialize();
    EXPECT_FALSE(serialized.empty());

    ScreenCalibrationProfile restored;
    EXPECT_TRUE(restored.deserialize(serialized));

    EXPECT_EQ(restored.m_version, original.m_version);
    EXPECT_TRUE(restored.m_enabled);
    EXPECT_NEAR(restored.m_scaleX, original.m_scaleX, 0.000001);
    EXPECT_NEAR(restored.m_scaleY, original.m_scaleY, 0.000001);
    EXPECT_EQ(restored.m_offsetX, original.m_offsetX);
    EXPECT_EQ(restored.m_offsetY, original.m_offsetY);
    EXPECT_EQ(restored.m_srcWidth, original.m_srcWidth);
    EXPECT_EQ(restored.m_srcHeight, original.m_srcHeight);
    EXPECT_EQ(restored.m_dstWidth, original.m_dstWidth);
    EXPECT_EQ(restored.m_dstHeight, original.m_dstHeight);
    EXPECT_DOUBLE_EQ(restored.m_backingScaleFactor, original.m_backingScaleFactor);
    EXPECT_EQ(restored.m_displayName, original.m_displayName);
    EXPECT_EQ(restored.m_timestamp, original.m_timestamp);
}

TEST_F(ScreenCalibrationTest, TransformCalculationAndClamping)
{
    ScreenCalibrationProfile prof;
    prof.m_enabled = true;
    prof.m_scaleX = 1.0;
    prof.m_scaleY = 1.0;
    prof.m_offsetX = 10;
    prof.m_offsetY = -20;
    prof.m_dstWidth = 1512;
    prof.m_dstHeight = 982;

    SInt32 outX = 0, outY = 0;
    prof.applyTransform(100, 100, outX, outY);
    EXPECT_EQ(outX, 110);
    EXPECT_EQ(outY, 80);

    // Test lower clamping (negative coordinate becomes 0)
    prof.applyTransform(0, 10, outX, outY);
    EXPECT_EQ(outX, 10);
    EXPECT_EQ(outY, 0); // 10 - 20 = -10 clamped to 0

    // Test upper clamping (exceeding dst bounds clamped to dst - 1)
    prof.applyTransform(1600, 1100, outX, outY);
    EXPECT_EQ(outX, 1511);
    EXPECT_EQ(outY, 981);
}

TEST_F(ScreenCalibrationTest, StaleProfileDetection)
{
    ScreenCalibrationProfile prof;
    prof.m_enabled = true;
    prof.m_dstWidth = 1512;
    prof.m_dstHeight = 982;
    prof.m_backingScaleFactor = 2.0;

    // Same geometry: not stale
    EXPECT_FALSE(prof.isStale(1512, 982, 2.0));

    // Changed width: stale
    EXPECT_TRUE(prof.isStale(1920, 982, 2.0));

    // Changed height: stale
    EXPECT_TRUE(prof.isStale(1512, 1080, 2.0));

    // Changed scale factor: stale
    EXPECT_TRUE(prof.isStale(1512, 982, 1.0));

    // Disabled profile is never considered stale
    prof.m_enabled = false;
    EXPECT_FALSE(prof.isStale(1920, 1080, 1.0));
}

TEST_F(ScreenCalibrationTest, CalibrationManagerReset)
{
    ScreenCalibrationManager& mgr = ScreenCalibrationManager::getInstance();

    ScreenCalibrationProfile prof;
    prof.m_enabled = true;
    prof.m_scaleX = 1.5;
    mgr.setProfile(prof);
    EXPECT_TRUE(mgr.isEnabled());

    mgr.reset();
    EXPECT_FALSE(mgr.isEnabled());
    EXPECT_DOUBLE_EQ(mgr.getProfile().m_scaleX, 1.0);
    EXPECT_EQ(mgr.getPointRecords().size(), 0);
    EXPECT_EQ(mgr.getTestRecords().size(), 0);
}

TEST_F(ScreenCalibrationTest, JitterAnalyzerSampleAndJumpDetection)
{
    JitterAnalyzer jitter;
    EXPECT_EQ(jitter.getTotalSamples(), 0);
    EXPECT_EQ(jitter.getDuplicateCount(), 0);
    EXPECT_EQ(jitter.getJumpCount(), 0);

    jitter.recordSample(100, 100);
    jitter.recordSample(100, 100); // duplicate
    EXPECT_EQ(jitter.getTotalSamples(), 2);
    EXPECT_EQ(jitter.getDuplicateCount(), 1);

    // Normal smooth motion
    jitter.recordSample(102, 101);
    jitter.recordSample(104, 102);
    EXPECT_EQ(jitter.getJumpCount(), 0);

    // Sudden large quantized jump (> 60px)
    jitter.recordSample(250, 250);
    EXPECT_GT(jitter.getMaxJumpDelta(), 60.0);
    EXPECT_GE(jitter.getJumpCount(), 1);
}

TEST_F(ScreenCalibrationTest, CalibrationSessionAndTestRecording)
{
    ScreenCalibrationManager& mgr = ScreenCalibrationManager::getInstance();
    mgr.startCalibrationSession(42);

    mgr.recordPoint(42, 0, 0, 100, 0, 91, 0, 91);
    mgr.recordPoint(42, 1, 0, 540, 0, 491, 0, 491);
    EXPECT_EQ(mgr.getPointRecords().size(), 2);
    EXPECT_EQ(mgr.getPointRecords()[0].measuredY, 91);
    EXPECT_EQ(mgr.getPointRecords()[1].measuredY, 491);

    mgr.recordTestPoint(42, 0, 0, 491, 0, 490);
    EXPECT_EQ(mgr.getTestRecords().size(), 1);
    EXPECT_EQ(mgr.getTestRecords()[0].errorY, -1);
    EXPECT_TRUE(mgr.getTestRecords()[0].passed);
}

TEST_F(ScreenCalibrationTest, ImmediateCalibrationOnStartup)
{
    ScreenCalibrationManager& mgr = ScreenCalibrationManager::getInstance();
    EXPECT_FALSE(mgr.isSessionActive());
    EXPECT_NO_THROW({
        mgr.startCalibrationSession(999);
        EXPECT_TRUE(mgr.isSessionActive());
        EXPECT_EQ(mgr.getActiveSessionSeq(), 999);
        mgr.recordPoint(999, 0, 0, 100, 0, 100, 0, 100);
        mgr.recordTestPoint(999, 0, 0, 100, 0, 100);
    });
    EXPECT_EQ(mgr.getPointRecords().size(), 1);
    EXPECT_EQ(mgr.getTestRecords().size(), 1);
}

TEST_F(ScreenCalibrationTest, CancelCalibrationSession)
{
    ScreenCalibrationManager& mgr = ScreenCalibrationManager::getInstance();
    mgr.startCalibrationSession(777);
    EXPECT_TRUE(mgr.isSessionActive());

    mgr.cancelCalibrationSession(777);
    EXPECT_FALSE(mgr.isSessionActive());
    EXPECT_EQ(mgr.getActiveSessionSeq(), 0);
}

TEST_F(ScreenCalibrationTest, CloseWindowDuringCalibrationSimulation)
{
    ScreenCalibrationManager& mgr = ScreenCalibrationManager::getInstance();
    mgr.startCalibrationSession(888);
    mgr.recordPoint(888, 0, 0, 200, 0, 180, 0, 180);

    // Simulate dialog close / reject
    if (mgr.isSessionActive()) {
        mgr.cancelCalibrationSession();
    }
    EXPECT_FALSE(mgr.isSessionActive());
}

TEST_F(ScreenCalibrationTest, DisconnectAndReconnectDuringCalibration)
{
    ScreenCalibrationManager& mgr = ScreenCalibrationManager::getInstance();
    mgr.startCalibrationSession(555);

    // Simulate disconnect: resets session & manager
    mgr.reset();
    EXPECT_FALSE(mgr.isSessionActive());
    EXPECT_FALSE(mgr.isEnabled());

    // Simulate reconnect: manager can start cleanly again
    mgr.startCalibrationSession(556);
    EXPECT_TRUE(mgr.isSessionActive());
    EXPECT_EQ(mgr.getActiveSessionSeq(), 556);
}

TEST_F(ScreenCalibrationTest, LoggingDuringCalibrationDiagnostics)
{
    ScreenCalibrationManager& mgr = ScreenCalibrationManager::getInstance();
    EXPECT_NO_THROW({
        mgr.logAccessibilityStatus(true);
        mgr.logAccessibilityStatus(false);
        mgr.logDisplayGeometry("Liquid Retina", 1512, 982, 2.0, 3024, 1964);
        mgr.logSampleCount();
    });
}
