#include <stdio.h>

int main() {
    char ch;
    while (scanf("%c", &ch), ch != '\n') {
        printf("%c", ch <= 'z' && ch >= 'a' ? ch - 32 : ch);
    }
    printf("\n");
    return 0;
}
