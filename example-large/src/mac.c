#include "mac.h"

void mac_user(int x) {
    MAC_LOG(x);              /* expands to util_log(x) — call via macro */
    MAC_WRITE(9, x + 1);     /* expands to bus_write(9, x + 1) — call via macro */
    int r = bus_read(9);     /* a plain (non-macro) call, for contrast */
    util_log(r);             /* a plain util_log call too */
}
