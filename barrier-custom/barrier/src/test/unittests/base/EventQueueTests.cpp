/*
 * barrier -- mouse and keyboard sharing utility
 * Copyright (C) 2014-2016 Symless Ltd.
 *
 * This package is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * found in the file LICENSE that should have accompanied this file.
 *
 * This package is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "base/EventQueue.h"
#include "base/SimpleEventQueueBuffer.h"
#include "mt/Thread.h"
#include "arch/Arch.h"
#include "test/global/gtest.h"

TEST(EventQueueTests, waitForReady_threadedStartup_succeedsDeterministically)
{
    EventQueue queue;
    queue.adoptBuffer(new SimpleEventQueueBuffer());

    // Spawn a thread that starts the event queue loop
    Thread thread([&queue]() {
        // Post a quit event so loop() terminates cleanly after starting
        ARCH->sleep(0.05);
        queue.addEvent(Event(Event::kQuit));
    });

    // Start loop in worker thread
    Thread loopThread([&queue]() {
        queue.loop();
    });

    // Main thread calls waitForReady()
    EXPECT_NO_THROW({
        queue.waitForReady();
    });

    loopThread.wait();
    thread.wait();
}
