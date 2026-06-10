#include "svc_0.h"

int svc0_f0(int x) {
    util_log(x);                  /* hub */
    int p = drv0_f0(x);
    int q = drv3_f2(p);
    bus_write(0, p ^ q);   /* hub */
    return p + q;
}

int svc0_f1(int x) {
    util_log(x);                  /* hub */
    int p = drv0_f1(x);
    int q = drv3_f3(p);
    bus_write(1, p ^ q);   /* hub */
    return p + q;
}

int svc0_f2(int x) {
    util_log(x);                  /* hub */
    int p = drv0_f2(x);
    int q = drv3_f4(p);
    bus_write(2, p ^ q);   /* hub */
    return p + q;
}

int svc0_f3(int x) {
    util_log(x);                  /* hub */
    int p = drv0_f3(x);
    int q = drv3_f5(p);
    bus_write(3, p ^ q);   /* hub */
    return p + q;
}

int svc0_f4(int x) {
    util_log(x);                  /* hub */
    int p = drv0_f4(x);
    int q = drv3_f0(p);
    bus_write(4, p ^ q);   /* hub */
    return p + q;
}

int svc0_f5(int x) {
    util_log(x);                  /* hub */
    int p = drv0_f5(x);
    int q = drv3_f1(p);
    bus_write(5, p ^ q);   /* hub */
    return p + q;
}
