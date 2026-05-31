#include <stdio.h>

int main(int argc, char* argv[]) {
    short x = -4321;
    unsigned short y = (unsigned short)x;
    printf("x = %d, y = %d", x, y);
}
