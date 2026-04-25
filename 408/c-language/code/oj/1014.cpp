#include <stdio.h>

/**
 * http://oj.lgwenda.com/problem/1014
* 挂盐水
Description

挂盐水的时候，如果滴起来有规律，先是滴一滴，停一下；然后滴二滴，停一下；再滴三滴，停一下...，现在有一个问题：这瓶盐水一共有VUL毫升，每一滴是D毫升，每一滴的速度是一秒（假设最后一滴不到D毫升，则花费的时间也算一秒），停一下的时间也是一秒这瓶水什么时候能挂完呢？


Input

输入数据包含多个测试实例，每个实例占一行，由VUL和D组成，其中 0<D<VUL<5000。(输入EOF说明结束)


Output

对于每组测试数据，请输出挂完盐水需要的时间，每个实例的输出占一行。
 */

int main() {
    int total, d;
    while (scanf("%d%d", &total, &d) == 2) {
        int num = 0, result = 0;
        while (total > 0) {
            num++;
            for (int i = 0; i < num; i++) {
                total -= d;
                result++;
                if (total <= 0) {
                    break;
                }
            }
            if (total > 0) {
                result++;
            }
        }
        printf("%d\n", result);
    }
    return 0;
}
