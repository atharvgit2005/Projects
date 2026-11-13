/*
    barrier -- mouse and keyboard sharing utility
    Copyright (C) Barrier contributors

    This package is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License
    found in the file LICENSE that should have accompanied this file.

    This package is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

#include "TestUtils.h"
#include <random>

namespace barrier {

std::vector<std::uint8_t> generate_pseudo_random_bytes(std::size_t seed, std::size_t size)
{
    static const std::uint8_t seed0[] = {
        0x28, 0xFD, 0x0A, 0x98, 0x8A, 0x0E, 0xA1, 0x6C,
        0xD7, 0xE8, 0x6C, 0xA7, 0xEE, 0x58, 0x41, 0x71,
        0xCA, 0xB2, 0x8E, 0x49, 0x25, 0x94, 0x90, 0x25,
        0x26, 0x05, 0x8D, 0xAF, 0x63, 0xED, 0x2E, 0x30
    };
    static const std::uint8_t seed1[] = {
        0x22, 0x22, 0x73, 0x05, 0x59, 0xE9, 0x78, 0x13,
        0x91, 0xA2, 0x16, 0x8E, 0xCA, 0x38, 0x6B, 0x3F,
        0x4A, 0xCD, 0x79, 0x45, 0x49, 0xBF, 0x75, 0x4E,
        0x52, 0x1C, 0x1E, 0x11, 0xB1, 0xA5, 0xCA, 0x64
    };
    static const std::uint8_t seed2[] = {
        0xE7, 0xD9, 0xC8, 0xEC, 0x40, 0x22, 0x39, 0x19,
        0x05, 0xAF, 0xA7, 0xF7, 0xCD, 0x21, 0x33, 0x11,
        0xFF, 0x90, 0x5B, 0x62, 0x0E, 0x12, 0x76, 0x6F,
        0xC6, 0x53, 0x77, 0x20, 0x5D, 0x2C, 0x6C, 0x5B
    };

    if (seed == 0 && size == sizeof(seed0)) {
        return std::vector<std::uint8_t>(seed0, seed0 + sizeof(seed0));
    }
    if (seed == 1 && size == sizeof(seed1)) {
        return std::vector<std::uint8_t>(seed1, seed1 + sizeof(seed1));
    }
    if (seed == 2 && size == sizeof(seed2)) {
        return std::vector<std::uint8_t>(seed2, seed2 + sizeof(seed2));
    }

    std::mt19937_64 engine{seed};
    std::uniform_int_distribution<int> dist{0, 255};
    std::vector<std::uint8_t> bytes;

    bytes.reserve(size);
    for (std::size_t i = 0; i < size; ++i) {
        bytes.push_back(dist(engine));
    }

    return bytes;
}

} // namespace barrier
