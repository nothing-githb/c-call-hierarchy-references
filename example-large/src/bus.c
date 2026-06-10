#include "bus.h"

int  g_bus[BUS_REGS];
int  g_state;
long g_counter;
int  g_reads;
int  g_writes;

void bus_write(int reg, int val) {
    g_bus[reg & (BUS_REGS - 1)] = val;   /* write */
    g_writes++;                          /* write */
}

int bus_read(int reg) {
    g_reads++;                           /* write */
    return g_bus[reg & (BUS_REGS - 1)];  /* read */
}
