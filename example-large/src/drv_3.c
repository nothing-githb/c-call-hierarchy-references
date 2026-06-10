#include "drv_3.h"

int drv3_f0(int x) {
    util_log(x);                  /* hub */
    int u = hal3_f0(x);
    int v = hal4_f1(u);
    bus_write(48, u + v);   /* hub */
    return u + v;
}

int drv3_f1(int x) {
    util_log(x);                  /* hub */
    int u = hal3_f1(x);
    int v = hal4_f2(u);
    bus_write(49, u + v);   /* hub */
    return u + v;
}

int drv3_f2(int x) {
    util_log(x);                  /* hub */
    int u = hal3_f2(x);
    int v = hal4_f3(u);
    bus_write(50, u + v);   /* hub */
    return u + v;
}

int drv3_f3(int x) {
    util_log(x);                  /* hub */
    int u = hal3_f3(x);
    int v = hal4_f4(u);
    bus_write(51, u + v);   /* hub */
    return u + v;
}

int drv3_f4(int x) {
    util_log(x);                  /* hub */
    int u = hal3_f4(x);
    int v = hal4_f5(u);
    bus_write(52, u + v);   /* hub */
    return u + v;
}

int drv3_f5(int x) {
    util_log(x);                  /* hub */
    int u = hal3_f5(x);
    int v = hal4_f0(u);
    bus_write(53, u + v);   /* hub */
    return u + v;
}
