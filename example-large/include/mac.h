#ifndef MAC_H
#define MAC_H
#include "util.h"
#include "bus.h"

/* Function calls hidden inside function-like macros. */
#define MAC_LOG(v)       util_log((v))
#define MAC_WRITE(r, v)  bus_write((r), (v))

void mac_user(int x);

#endif /* MAC_H */
