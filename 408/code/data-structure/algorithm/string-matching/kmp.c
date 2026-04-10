#include <stdio.h>
#include <stdlib.h>

// https://leetcode.cn/problems/find-the-index-of-the-first-occurrence-in-a-string/description/
// 最坏时间复杂度 O(m+n): 求 next 数组时间复杂度
// O(m)，匹配模式过程最坏时间复杂度 O(n)
// next[j] = 当模式串第 j 位失配时，下一步应该跳到的位置（下标）
//   next[0] = -1
//   next 存的是：👉 “跳转位置”
//   失配时： j = next[j];
// next[i] = 子串 T[0..i] 的最长“相等的真前缀 = 真后缀”的长度
//   next[0] = 0
//   next 存的是：👉 “长度”
//   失配时：j = next[j - 1];

#define MAX_SIZE 10
typedef struct {
  char ch[MAX_SIZE];
  int length;
} SString;

/*
 * 求老版 next 数组
 * 定义：
 *   next[j] = 当模式串第 j 位失配时，j 应跳转到的位置
 * 特征：
 *   next[0] = -1
 *
 * 返回值：
 *   动态申请的 next 数组，使用后需要 free
 */
int *Get_Next(const SString *t) {
  if (t == NULL || t->length <= 0) {
    return NULL;
  }

  int *next = (int *)malloc(sizeof(int) * t->length);
  if (next == NULL) {
    return NULL;
  }

  int j = 0;  // j 表示：我们正在求 next[j]
  int k = -1; // k 表示：如果当前失配，模式串应该继续去比较的位置。

  // j 正在往右推进，逐个求 next 数组的位置。 
  // k 当前正在试的“候选跳转位置”。 
  // 如果 t[j] == t[k] 说明这个候选跳转位置可行，可以据此写出下一项 next。 
  // 如果 t[j] != t[k] 说明这个候选跳转位置不行，就按 next[k] 再退到更前面的候选位置。

  next[0] = -1;

  while (j < t->length - 1) {
    if (k == -1 || t->ch[j] == t->ch[k]) {
      ++j;
      ++k;
      next[j] = k;
    } else {
      k = next[k];
    }
  }

  return next;
}

/*
 * 在老版 next 的基础上求 nextval
 * 优化思想：
 *   若 t->ch[j] == t->ch[next[j]]
 *   那么失配后跳到 next[j] 仍会立刻失配
 *   所以继续跳到 next[next[j]]
 *
 * 参数：
 *   next: 已经求好的老版 next 数组
 *
 * 返回值：
 *   动态申请的 nextval 数组，使用后需要 free
 */
int *Get_NextVal(int *next, const SString *t) {
  if (t == NULL || next == NULL || t->length <= 0) {
    return NULL;
  }

  int *nextval = (int *)malloc(sizeof(int) * t->length);
  if (nextval == NULL) {
    return NULL;
  }

  nextval[0] = -1;

  for (int j = 1; j < t->length; ++j) {
    if (t->ch[j] == t->ch[next[j]]) {
      nextval[j] = nextval[next[j]];
    } else {
      nextval[j] = next[j];
    }
  }

  return nextval;
}

/*
 * KMP 模式匹配
 * 返回：
 *   匹配成功：返回模式串在主串中的起始下标
 *   匹配失败：返回 -1
 *
 * 这里使用 nextval，也可以改成 next
 */
int Index_KMP(const SString *str, const SString *t) {
  if (str == NULL || t == NULL) {
    return -1;
  }

  if (t->length == 0) {
    return 0;
  }

  int *next = Get_Next(t);
  if (next == NULL) {
    return -1;
  }

  int *nextval = Get_NextVal(next, t);
  if (nextval == NULL) {
    free(next);
    return -1;
  }

  int i = 0; // 主串指针
  int j = 0; // 模式串指针

  while (i < str->length && j < t->length) {
    if (j == -1 || str->ch[i] == t->ch[j]) {
      ++i;
      ++j;
    } else {
      j = nextval[j];
    }
  }

  free(next);
  free(nextval);

  if (j == t->length) {
    return i - j;
  }

  return -1;
}

int main() { return 1; }