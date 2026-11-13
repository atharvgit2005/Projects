/*
 * barrier -- mouse and keyboard sharing utility
 * Copyright (C) 2026 Atharv KVM
 *
 * This package is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * found in the file LICENSE that should have accompanied this file.
 */

#pragma once

#include <QString>

enum class AccessibilityStatus {
    Granted,
    NotGranted,
    Unavailable
};

class MacAccessibility {
public:
    static AccessibilityStatus checkStatus(bool promptIfNeeded = false);
    static bool isGranted();
    static void openSettings();
    static QString getStatusDescription();
};
