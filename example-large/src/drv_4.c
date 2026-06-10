#include "drv_4.h"

int drv4_f0(int x) {
    util_log(x);                  /* hub */
    int u = hal4_f0(x);
    int v = hal0_f1(u);
    bus_write(64, u + v);   /* hub */
    return u + v;
}

int drv4_f1(int x) {
    util_log(x);                  /* hub */
    int u = hal4_f1(x);
    int v = hal0_f2(u);
    bus_write(65, u + v);   /* hub */
    return u + v;
}

int drv4_f2(int x) {
    util_log(x);                  /* hub */
    int u = hal4_f2(x);
    int v = hal0_f3(u);
    bus_write(66, u + v);   /* hub */
    return u + v;
}

int drv4_f3(int x) {
    util_log(x);                  /* hub */
    int u = hal4_f3(x);
    int v = hal0_f4(u);
    bus_write(67, u + v);   /* hub */
    return u + v;
}

int drv4_f4(int x) {
    util_log(x);                  /* hub */
    int u = hal4_f4(x);
    int v = hal0_f5(u);
    bus_write(68, u + v);   /* hub */
    return u + v;
}

int drv4_f5(int x) {
    util_log(x);                  /* hub */
    int u = hal4_f5(x);
    int v = hal0_f0(u);
    bus_write(69, u + v);   /* hub */
    return u + v;
}
