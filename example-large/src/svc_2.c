#include "svc_2.h"

int svc2_f0(int x) {
    util_log(x);                  /* hub */
    int p = drv2_f0(x);
    int q = drv0_f2(p);
    bus_write(32, p ^ q);   /* hub */
    return p + q;
}

int svc2_f1(int x) {
    util_log(x);                  /* hub */
    int p = drv2_f1(x);
    int q = drv0_f3(p);
    bus_write(33, p ^ q);   /* hub */
    return p + q;
}

int svc2_f2(int x) {
    util_log(x);                  /* hub */
    int p = drv2_f2(x);
    int q = drv0_f4(p);
    bus_write(34, p ^ q);   /* hub */
    return p + q;
}

int svc2_f3(int x) {
    util_log(x);                  /* hub */
    int p = drv2_f3(x);
    int q = drv0_f5(p);
    bus_write(35, p ^ q);   /* hub */
    return p + q;
}

int svc2_f4(int x) {
    util_log(x);                  /* hub */
    int p = drv2_f4(x);
    int q = drv0_f0(p);
    bus_write(36, p ^ q);   /* hub */
    return p + q;
}

int svc2_f5(int x) {
    util_log(x);                  /* hub */
    int p = drv2_f5(x);
    int q = drv0_f1(p);
    bus_write(37, p ^ q);   /* hub */
    return p + q;
}
