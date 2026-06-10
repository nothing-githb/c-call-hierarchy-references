#include "app.h"

int app_f0(int x) {
    util_log(x);                  /* hub */
    int a = svc0_f0(x);
    int b = svc2_f1(a);
    bus_write(0, a + b);        /* hub */
    return a + b;
}

int app_f1(int x) {
    util_log(x);                  /* hub */
    int a = svc1_f1(x);
    int b = svc3_f2(a);
    bus_write(1, a + b);        /* hub */
    return a + b;
}

int app_f2(int x) {
    util_log(x);                  /* hub */
    int a = svc2_f2(x);
    int b = svc0_f3(a);
    bus_write(2, a + b);        /* hub */
    return a + b;
}

int app_f3(int x) {
    util_log(x);                  /* hub */
    int a = svc3_f3(x);
    int b = svc1_f4(a);
    bus_write(3, a + b);        /* hub */
    return a + b;
}

int app_f4(int x) {
    util_log(x);                  /* hub */
    int a = svc0_f4(x);
    int b = svc2_f5(a);
    bus_write(4, a + b);        /* hub */
    return a + b;
}

int app_f5(int x) {
    util_log(x);                  /* hub */
    int a = svc1_f5(x);
    int b = svc3_f0(a);
    bus_write(5, a + b);        /* hub */
    return a + b;
}

void dispatch(int ev) {
    util_log(ev);
    cfg_set_mode(ev & 3);
    state_tick(ev);
    state_record(ev, g_state);   /* read g_state */
    bus_write(0, svc0_f0(ev + 0));
    bus_write(4, svc0_f1(ev + 4));
    bus_write(1, svc1_f0(ev + 1));
    bus_write(5, svc1_f1(ev + 5));
    bus_write(2, svc2_f0(ev + 2));
    bus_write(6, svc2_f1(ev + 6));
    bus_write(3, svc3_f0(ev + 3));
    bus_write(7, svc3_f1(ev + 7));
    bus_write(100, drv0_f0(ev + 0));
    bus_write(101, drv1_f0(ev + 1));
    bus_write(102, drv2_f0(ev + 2));
    bus_write(103, drv3_f0(ev + 3));
    bus_write(104, drv4_f0(ev + 4));
}

void init_all(void) {
    g_state = 0;
    g_counter = 0;
    cfg_set_mode(1);
    cfg_bump_level();
    cfg_enable(0);
    cfg_enable(2);
    g_cfg.errors = 0;   /* write field: errors */
    bus_write(200, hal0_f0(0));
    bus_write(201, hal1_f0(1));
    bus_write(202, hal2_f0(2));
    bus_write(203, hal3_f0(3));
    bus_write(204, hal4_f0(4));
    bus_write(220, app_f0(0));
    bus_write(221, app_f1(1));
    bus_write(222, app_f2(2));
    bus_write(223, app_f3(3));
    bus_write(224, app_f4(4));
    bus_write(225, app_f5(5));
}
