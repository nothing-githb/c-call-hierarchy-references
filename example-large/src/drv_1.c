#include "drv_1.h"

int drv1_f0(int x) {
    util_log(x);                  /* hub */
    int u = hal1_f0(x);
    int v = hal2_f1(u);
    bus_write(16, u + v);   /* hub */
    return u + v;
}

int drv1_f1(int x) {
    util_log(x);                  /* hub */
    int u = hal1_f1(x);
    int v = hal2_f2(u);
    bus_write(17, u + v);   /* hub */
    return u + v;
}

int drv1_f2(int x) {
    util_log(x);                  /* hub */
    int u = hal1_f2(x);
    int v = hal2_f3(u);
    bus_write(18, u + v);   /* hub */
    return u + v;
}

int drv1_f3(int x) {
    util_log(x);                  /* hub */
    int u = hal1_f3(x);
    int v = hal2_f4(u);
    bus_write(19, u + v);   /* hub */
    return u + v;
}

int drv1_f4(int x) {
    util_log(x);                  /* hub */
    int u = hal1_f4(x);
    int v = hal2_f5(u);
    bus_write(20, u + v);   /* hub */
    return u + v;
}

int drv1_f5(int x) {
    util_log(x);                  /* hub */
    int u = hal1_f5(x);
    int v = hal2_f0(u);
    bus_write(21, u + v);   /* hub */
    return u + v;
}
