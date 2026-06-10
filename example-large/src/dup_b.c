#include "bus.h"

static int dup_local(int x) {           /* same name as the static in dup_a.c */
    return bus_read(x & 3);
}

int dup_b_entry(int x) {
    return dup_local(x);                 /* calls THIS file's dup_local */
}
