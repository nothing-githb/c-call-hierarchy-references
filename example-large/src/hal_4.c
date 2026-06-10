#include "hal_4.h"

int hal4_f0(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 0);           /* hub */
    bus_write(64, s + x);      /* hub */
    int r = bus_read(64);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal4_f1(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 1);           /* hub */
    bus_write(65, s + x);      /* hub */
    int r = bus_read(65);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal4_f2(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 2);           /* hub */
    bus_write(66, s + x);      /* hub */
    int r = bus_read(66);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal4_f3(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 3);           /* hub */
    bus_write(67, s + x);      /* hub */
    int r = bus_read(67);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal4_f4(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 4);           /* hub */
    bus_write(68, s + x);      /* hub */
    int r = bus_read(68);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal4_f5(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 5);           /* hub */
    bus_write(69, s + x);      /* hub */
    int r = bus_read(69);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}
