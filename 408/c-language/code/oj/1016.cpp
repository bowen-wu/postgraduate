#include <stdio.h>

/**
 * http://oj.lgwenda.com/problem/1016
* 手机话费
Description

小明的手机每天消费1元，每消费K元就可以获赠1元，一开始小明有M元，问最多可以用多少天？


Input

输入包括多个测试实例。每个测试实例包括2个整数M，K（2<=k<=M<=1000)。M=0，K=0代表输入结束。


Output

对于每个测试实例输出一个整数，表示M元可以用的天数。
*/

int main() {
    int m, k;
    // scanf 返回值是成功读到的变量个数，如果返回值是-1，是特殊情况，称为EOF
    while (scanf("%d%d", &m, &k) == 2) {
        if (m == 0 && k == 0) {
            break;
        }

        int days = 0;
        int i = 0;
        while (m > 0) {
            days++;
            i++;
            m--;
            if (i % k == 0) {
                i = 0;
                m++;
            }
        }
        printf("%d\n", days);
    }

    return 0;
}
