#include "app.h"

int main(void) {
    init_all();
    for (int i = 0; i < 100; i++) {
        dispatch(i);
    }
    return g_state + g_reads + g_writes + state_health();
}
