#ifndef APP_H
#define APP_H
#include "svc_0.h"
#include "svc_1.h"
#include "svc_2.h"
#include "svc_3.h"
#include "bus.h"
#include "util.h"
#include "state.h"

int app_f0(int x);
int app_f1(int x);
int app_f2(int x);
int app_f3(int x);
int app_f4(int x);
int app_f5(int x);
void dispatch(int ev);
void init_all(void);

#endif /* APP_H */
