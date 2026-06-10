#include "state.h"

config_t g_cfg;
int      g_events[32];

/* --- struct field writes --- */
void cfg_set_mode(int m) {
    g_cfg.mode = m;                 /* write field: mode */
}
void cfg_bump_level(void) {
    g_cfg.level++;                  /* write field: level (read-modify-write) */
}
void cfg_enable(int bit) {
    g_cfg.flags |= (1 << bit);      /* write field: flags */
}
void cfg_disable(int bit) {
    g_cfg.flags &= ~(1 << bit);     /* write field: flags */
}

/* --- struct field reads --- */
int cfg_get_mode(void) {
    return g_cfg.mode;              /* read field: mode */
}
int cfg_level(void) {
    return g_cfg.level;             /* read field: level */
}
int cfg_is_enabled(int bit) {
    return (g_cfg.flags >> bit) & 1;   /* read field: flags */
}

/* --- mixed global + field read/write --- */
void state_tick(int ev) {
    g_events[ev & 31] = g_state;       /* write array elem, read g_state */
    g_counter += g_cfg.level;          /* write g_counter, read field level */
    if (g_state > 100) {               /* read g_state */
        g_state = 0;                   /* write g_state */
        g_cfg.errors++;                /* write field: errors */
    }
    g_state += cfg_get_mode();         /* read+write g_state */
    state_load(&g_state);              /* address-of g_state (& — potential write) */
    state_load(&g_cfg.errors);         /* address-of g_cfg / field */
}

/* writes through the pointer — why &g_state is a potential write */
void state_load(int *dst) {
    *dst = g_counter & 0xff;           /* write via pointer */
}

int state_health(void) {
    int e = g_cfg.errors;              /* read field: errors */
    if (g_counter > 1000) {            /* read g_counter */
        return g_state - e;            /* read g_state, read e */
    }
    return g_cfg.level + g_events[0];  /* read field: level, read array elem */
}

void state_record(int idx, int value) {
    g_events[idx & 31] = value;        /* write array elem */
    g_cfg.mode = g_events[idx & 31];   /* write field mode, read array elem */
}
