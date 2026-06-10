#ifndef COMMON_H
#define COMMON_H

#define BUS_REGS 256

/* A struct whose FIELDS are read & written in many places (struct-field demo). */
typedef struct {
    int mode;
    int level;
    int flags;
    int errors;
} config_t;

/* Global state — exercised by Find References (read vs write). */
extern int      g_bus[BUS_REGS];
extern int      g_state;
extern long     g_counter;
extern int      g_reads;
extern int      g_writes;
extern config_t g_cfg;        /* global struct instance */
extern int      g_events[32];

#endif /* COMMON_H */
