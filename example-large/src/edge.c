#include "edge.h"

/* Isolated: declared in edge.h, defined here, calls nothing, called by nobody. */
int edge_orphan(void) {
    return 7;
}

void edge_use_inline(int x) {
    bus_write(250, edge_inline(x));     /* the only caller of edge_inline */
}
