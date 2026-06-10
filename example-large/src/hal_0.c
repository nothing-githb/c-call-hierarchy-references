#include "hal_0.h"

int hal0_f0(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 0);           /* hub */
    bus_write(0, s + x);      /* hub */
    int r = bus_read(0);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal0_f1(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 1);           /* hub */
    bus_write(1, s + x);      /* hub */
    int r = bus_read(1);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal0_f2(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 2);           /* hub */
    bus_write(2, s + x);      /* hub */
    int r = bus_read(2);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal0_f3(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 3);           /* hub */
    bus_write(3, s + x);      /* hub */
    int r = bus_read(3);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal0_f4(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 4);           /* hub */
    bus_write(4, s + x);      /* hub */
    int r = bus_read(4);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal0_f5(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 5);           /* hub */
    bus_write(5, s + x);      /* hub */
    int r = bus_read(5);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}
