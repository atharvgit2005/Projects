/*
 * barrier -- mouse and keyboard sharing utility
 * Copyright (C) 2026 Atharv KVM
 *
 * This package is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * found in the file LICENSE that should have accompanied this file.
 */

#include "MacAccessibility.h"
#include <QDesktopServices>
#include <QUrl>
#include <QProcess>

#if defined(Q_OS_MAC)
#include <ApplicationServices/ApplicationServices.h>

AccessibilityStatus MacAccessibility::checkStatus(bool promptIfNeeded)
{
    if (AXIsProcessTrusted()) {
        return AccessibilityStatus::Granted;
    }

    if (promptIfNeeded) {
        const void* keys[] = { kAXTrustedCheckOptionPrompt };
        const void* trueValue[] = { kCFBooleanTrue };
        CFDictionaryRef options = CFDictionaryCreate(NULL, keys, trueValue, 1, NULL, NULL);
        bool trusted = AXIsProcessTrustedWithOptions(options);
        CFRelease(options);
        return trusted ? AccessibilityStatus::Granted : AccessibilityStatus::NotGranted;
    }

    return AccessibilityStatus::NotGranted;
}

bool MacAccessibility::isGranted()
{
    return checkStatus(false) == AccessibilityStatus::Granted;
}

void MacAccessibility::openSettings()
{
    QUrl modernUrl("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
    if (!QDesktopServices::openUrl(modernUrl)) {
        QProcess::startDetached("open", QStringList() << "/System/Library/PreferencePanes/Security.prefPane");
    }
}

QString MacAccessibility::getStatusDescription()
{
    AccessibilityStatus st = checkStatus(false);
    switch (st) {
    case AccessibilityStatus::Granted:
        return "Accessibility: Enabled";
    case AccessibilityStatus::NotGranted:
        return "Accessibility: Not Granted";
    case AccessibilityStatus::Unavailable:
    default:
        return "Accessibility: Check Unavailable";
    }
}

#else

AccessibilityStatus MacAccessibility::checkStatus(bool) { return AccessibilityStatus::Granted; }
bool MacAccessibility::isGranted() { return true; }
void MacAccessibility::openSettings() {}
QString MacAccessibility::getStatusDescription() { return "Accessibility: N/A"; }

#endif
