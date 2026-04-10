#include <stdio.h>

// n个结点的二叉链表共有 n+1 个空链域

typedef struct TreeNode {
  int val;
  struct TreeNode *left, *right;
  struct TreeNode *parent;
} TreeNode, *BiTree;

int main() {
  BiTree root = NULL;

  root = (BiTree)malloc(sizeof(TreeNode));
  root->val = 1;
  root->left = NULL;
  root->right = NULL;

  return 1;
}