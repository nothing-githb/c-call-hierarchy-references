#include "hal_3.h"

int hal3_f0(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 0);           /* hub */
    bus_write(48, s + x);      /* hub */
    int r = bus_read(48);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal3_f1(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 1);           /* hub */
    bus_write(49, s + x);      /* hub */
    int r = bus_read(49);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal3_f2(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 2);           /* hub */
    bus_write(50, s + x);      /* hub */
    int r = bus_read(50);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal3_f3(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 3);           /* hub */
    bus_write(51, s + x);      /* hub */
    int r = bus_read(51);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal3_f4(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 4);           /* hub */
    bus_write(52, s + x);      /* hub */
    int r = bus_read(52);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal3_f5(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 5);           /* hub */
    bus_write(53, s + x);      /* hub */
    int r = bus_read(53);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}
