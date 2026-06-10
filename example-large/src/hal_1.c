#include "hal_1.h"

int hal1_f0(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 0);           /* hub */
    bus_write(16, s + x);      /* hub */
    int r = bus_read(16);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal1_f1(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 1);           /* hub */
    bus_write(17, s + x);      /* hub */
    int r = bus_read(17);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal1_f2(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 2);           /* hub */
    bus_write(18, s + x);      /* hub */
    int r = bus_read(18);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal1_f3(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 3);           /* hub */
    bus_write(19, s + x);      /* hub */
    int r = bus_read(19);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal1_f4(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 4);           /* hub */
    bus_write(20, s + x);      /* hub */
    int r = bus_read(20);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}

int hal1_f5(int x) {
    g_counter++;                  /* write */
    int s = g_state;              /* read  */
    util_log(x + 5);           /* hub */
    bus_write(21, s + x);      /* hub */
    int r = bus_read(21);      /* hub */
    g_state = util_mix(r, x) & 0xffff;   /* write */
    return r + s + x;
}
