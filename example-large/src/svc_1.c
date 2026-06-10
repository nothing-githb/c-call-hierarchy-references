#include "svc_1.h"

int svc1_f0(int x) {
    util_log(x);                  /* hub */
    int p = drv1_f0(x);
    int q = drv4_f2(p);
    bus_write(16, p ^ q);   /* hub */
    return p + q;
}

int svc1_f1(int x) {
    util_log(x);                  /* hub */
    int p = drv1_f1(x);
    int q = drv4_f3(p);
    bus_write(17, p ^ q);   /* hub */
    return p + q;
}

int svc1_f2(int x) {
    util_log(x);                  /* hub */
    int p = drv1_f2(x);
    int q = drv4_f4(p);
    bus_write(18, p ^ q);   /* hub */
    return p + q;
}

int svc1_f3(int x) {
    util_log(x);                  /* hub */
    int p = drv1_f3(x);
    int q = drv4_f5(p);
    bus_write(19, p ^ q);   /* hub */
    return p + q;
}

int svc1_f4(int x) {
    util_log(x);                  /* hub */
    int p = drv1_f4(x);
    int q = drv4_f0(p);
    bus_write(20, p ^ q);   /* hub */
    return p + q;
}

int svc1_f5(int x) {
    util_log(x);                  /* hub */
    int p = drv1_f5(x);
    int q = drv4_f1(p);
    bus_write(21, p ^ q);   /* hub */
    return p + q;
}
