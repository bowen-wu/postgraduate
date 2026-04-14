#include <stdio.h>

#define MAX_VERTEX_NUM 10
void dfs_traverse(const Graph *graph) {
  int *visited[MAX_VERTEX_NUM];
  for (int i = 0; i < MAX_VERTEX_NUM; i++) {
    visited[i] = 0;
  }
  int connected_component = 0;

  for (int i = 0; i < MAX_VERTEX_NUM; i++) {
    if (!visited[i]) {
      dfs(graph, i, visited);
      connected_component++;
    }
  }
}

void dfs(const Graph *graph, int v, int *visited) {
  visited[v] = 1;

}

int main() {
  return 0;
}