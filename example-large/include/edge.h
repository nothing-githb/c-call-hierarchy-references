#ifndef EDGE_H
#define EDGE_H
#include "util.h"
#include "bus.h"

/* Defined ONLY in this header (static inline): the definition lives in the .h,
   so call hierarchy opened here must stay anchored here (no re-anchor away). */
static inline int edge_inline(int x) {
    return util_mix(x, x) + 1;          /* callee: util_mix */
}

int  edge_orphan(void);                 /* isolated: no callers, no callees */
void edge_use_inline(int x);            /* the caller of edge_inline */

#endif /* EDGE_H */
