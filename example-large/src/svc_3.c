#include "svc_3.h"

int svc3_f0(int x) {
    util_log(x);                  /* hub */
    int p = drv3_f0(x);
    int q = drv1_f2(p);
    bus_write(48, p ^ q);   /* hub */
    return p + q;
}

int svc3_f1(int x) {
    util_log(x);                  /* hub */
    int p = drv3_f1(x);
    int q = drv1_f3(p);
    bus_write(49, p ^ q);   /* hub */
    return p + q;
}

int svc3_f2(int x) {
    util_log(x);                  /* hub */
    int p = drv3_f2(x);
    int q = drv1_f4(p);
    bus_write(50, p ^ q);   /* hub */
    return p + q;
}

int svc3_f3(int x) {
    util_log(x);                  /* hub */
    int p = drv3_f3(x);
    int q = drv1_f5(p);
    bus_write(51, p ^ q);   /* hub */
    return p + q;
}

int svc3_f4(int x) {
    util_log(x);                  /* hub */
    int p = drv3_f4(x);
    int q = drv1_f0(p);
    bus_write(52, p ^ q);   /* hub */
    return p + q;
}

int svc3_f5(int x) {
    util_log(x);                  /* hub */
    int p = drv3_f5(x);
    int q = drv1_f1(p);
    bus_write(53, p ^ q);   /* hub */
    return p + q;
}
