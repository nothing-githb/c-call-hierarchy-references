#include "drv_2.h"

int drv2_f0(int x) {
    util_log(x);                  /* hub */
    int u = hal2_f0(x);
    int v = hal3_f1(u);
    bus_write(32, u + v);   /* hub */
    return u + v;
}

int drv2_f1(int x) {
    util_log(x);                  /* hub */
    int u = hal2_f1(x);
    int v = hal3_f2(u);
    bus_write(33, u + v);   /* hub */
    return u + v;
}

int drv2_f2(int x) {
    util_log(x);                  /* hub */
    int u = hal2_f2(x);
    int v = hal3_f3(u);
    bus_write(34, u + v);   /* hub */
    return u + v;
}

int drv2_f3(int x) {
    util_log(x);                  /* hub */
    int u = hal2_f3(x);
    int v = hal3_f4(u);
    bus_write(35, u + v);   /* hub */
    return u + v;
}

int drv2_f4(int x) {
    util_log(x);                  /* hub */
    int u = hal2_f4(x);
    int v = hal3_f5(u);
    bus_write(36, u + v);   /* hub */
    return u + v;
}

int drv2_f5(int x) {
    util_log(x);                  /* hub */
    int u = hal2_f5(x);
    int v = hal3_f0(u);
    bus_write(37, u + v);   /* hub */
    return u + v;
}
