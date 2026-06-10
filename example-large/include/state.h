#ifndef STATE_H
#define STATE_H
#include "common.h"

void cfg_set_mode(int m);
int  cfg_get_mode(void);
void cfg_bump_level(void);
int  cfg_level(void);
void cfg_enable(int bit);
void cfg_disable(int bit);
int  cfg_is_enabled(int bit);
void state_tick(int ev);
int  state_health(void);
void state_record(int idx, int value);
void state_load(int *dst);

#endif /* STATE_H */
