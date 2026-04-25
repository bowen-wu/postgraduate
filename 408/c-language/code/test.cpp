#include <stdio.h>

int main() {
    int total;
    scanf("%d", &total);
    for (int i = 0; i < total; i++) {
        int money;
        scanf("%d", &money);
        int min_tips = money;
        for (int a = 0; a * 350 <= money; a++) {
            for (int b = 0; a * 350 + b * 200 <= money; b++) {
                for (int c = 0; a * 350 + b * 200 + c * 150 <= money; c++) {
                    min_tips = min_tips < money - a * 350 - b * 200 - c * 150
                                   ? min_tips
                                   : money - a * 350 - b * 200 - c * 150;
                    if (min_tips == 0) {
                        goto label;
                    }
                }
            }
        }
    label:
        printf("%d\n", min_tips);
    }

    return 0;
}
