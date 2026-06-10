#include "util.h"

void util_log(int code) {
    g_counter += code;          /* write */
}

int util_mix(int a, int b) {
    int s = g_state;            /* read */
    return (a ^ (b << 1)) + s;
}
