#include <binary-tree.c>
#include <stdio.h>

// 先序遍历：根左右 https://leetcode.cn/problems/binary-tree-preorder-traversal/description/
// 中序遍历：左跟右 https://leetcode.cn/problems/binary-tree-inorder-traversal/description/
// 后序遍历：左右根 https://leetcode.cn/problems/binary-tree-postorder-traversal/description/

int* PreOrder1(const TreeNode *root, int* retrunSize, int* index) {
  if (root != NULL) {
    retrunSize[*index] = root->val;
    *index += 1;
    PreOrder1(root->left, retrunSize, index);
    PreOrder1(root->right, retrunSize, index);
  }
}
int* PreOrder(const TreeNode *root, int* retrunSize) {
 return PreOrder1(root, retrunSize, 0);
}



int main() {}