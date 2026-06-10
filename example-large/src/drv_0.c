#include "drv_0.h"

int drv0_f0(int x) {
    util_log(x);                  /* hub */
    int u = hal0_f0(x);
    int v = hal1_f1(u);
    bus_write(0, u + v);   /* hub */
    return u + v;
}

int drv0_f1(int x) {
    util_log(x);                  /* hub */
    int u = hal0_f1(x);
    int v = hal1_f2(u);
    bus_write(1, u + v);   /* hub */
    return u + v;
}

int drv0_f2(int x) {
    util_log(x);                  /* hub */
    int u = hal0_f2(x);
    int v = hal1_f3(u);
    bus_write(2, u + v);   /* hub */
    return u + v;
}

int drv0_f3(int x) {
    util_log(x);                  /* hub */
    int u = hal0_f3(x);
    int v = hal1_f4(u);
    bus_write(3, u + v);   /* hub */
    return u + v;
}

int drv0_f4(int x) {
    util_log(x);                  /* hub */
    int u = hal0_f4(x);
    int v = hal1_f5(u);
    bus_write(4, u + v);   /* hub */
    return u + v;
}

int drv0_f5(int x) {
    util_log(x);                  /* hub */
    int u = hal0_f5(x);
    int v = hal1_f0(u);
    bus_write(5, u + v);   /* hub */
    return u + v;
}
