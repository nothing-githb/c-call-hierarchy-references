#include "hal_2.h"

int hal2_f0(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 0);           /* hub */
    bus_write(32, s + x);      /* hub */
    int r = bus_read(32);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal2_f1(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 1);           /* hub */
    bus_write(33, s + x);      /* hub */
    int r = bus_read(33);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal2_f2(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 2);           /* hub */
    bus_write(34, s + x);      /* hub */
    int r = bus_read(34);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal2_f3(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 3);           /* hub */
    bus_write(35, s + x);      /* hub */
    int r = bus_read(35);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal2_f4(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 4);           /* hub */
    bus_write(36, s + x);      /* hub */
    int r = bus_read(36);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal2_f5(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 5);           /* hub */
    bus_write(37, s + x);      /* hub */
    int r = bus_read(37);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}
