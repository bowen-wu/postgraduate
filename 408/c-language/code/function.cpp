#include <stdio.h>

int is_valid_triangle(int a, int b, int c);

int main() {
    return 0;
}

int is_valid_triangle(const int a, const int b, const int c) {
    const int result = a + b > c && a + c > b && b + c > a;
    if (result) {
        printf("Is Triangle!\n");
    } else {
        printf("Not Triangle!\n");
    }
    return result;
}
