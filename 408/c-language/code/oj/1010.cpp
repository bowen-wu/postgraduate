#include <stdio.h>

/*
 * http://oj.lgwenda.com/problem/1010
* 软件版本
Description

相信大家一定有过在网上下载软件而碰到多个不同版本的情况。一般来说，软件的版本号由三个部分组成，主版本号（Major Version Number），子版本号（Minor Version Number)和修订号（Revision_Number）。当软件进行了重大的修改时，主版本号加一；当软件在原有基础上增加部分功能时，主版本号不变，子版本号加一；当软件仅仅修正了部分bug时，主版本号和子版本号都不变，修正号加一。

在我们比较软件的两个版本的新旧时，都是先比较主版本号，当主版本号相同时再比较子版本号，前两者都相同的情况下再比较修正号。版本号越大的软件越新。

现在，小明在下载软件的时候碰到了两个版本，请你告诉他哪个版本更新一些。


Input

输入的第一行有一个整数T，代表有T组测试。接下来有T组测试。

每组测试分两行，第一行有三个整数代表第一个软件版本的主版本号，子版本号和修订号。第二行也有三个整数代表第二个软件版本的主版本号，子版本号和修订号。

数据中出现的整数都在[0，1000]范围之内。


Output

对于每组测试，如果第一个软件的版本新点，请输出First，如果第二个软件的版本新点，请输出Second，否则输出Same。
 */

int main() {
    int num;
    scanf("%d", &num);

    for (int i = 0; i < num; i++) {
        int major1, minor1, revision1, major2, minor2, revision2;
        scanf("%d%d%d", &major1, &minor1, &revision1);
        scanf("%d%d%d", &major2, &minor2, &revision2);
        if (major1 > major2 || (major1 == major2 && (minor1 > minor2 || (minor1 == minor2 && revision1 > revision2)))) {
            printf("First\n");
        } else if (major1 == major2 && minor1 == minor2 && revision1 == revision2) {
            printf("Same\n");
        } else {
            printf("Second\n");
        }
    }
}
