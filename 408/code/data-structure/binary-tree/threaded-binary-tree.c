#include <stdio.h>

// 注意：
//  1. 最后一个结点的right, rightTag 的处理
//  2. 先序线索化中，注意处理死循环问题，当leftTag == 0 时，才能对左子树线索化

typedef struct ThreadedBinaryTreeNode {
  int data;
  struct ThreadedBinaryTreeNode *left, *right;
  int leftTag, rightTag; // leftTag == 0 代表 left 是左孩子，leftTag == 1 代表 left 是前驱
} ThreadedBinaryTreeNode;

int main() { return 1; }