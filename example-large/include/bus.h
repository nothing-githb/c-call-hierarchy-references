#ifndef BUS_H
#define BUS_H
#include "common.h"

void bus_write(int reg, int val);
int  bus_read(int reg);

#endif /* BUS_H */
