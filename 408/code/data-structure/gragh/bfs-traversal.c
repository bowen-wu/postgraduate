#include <stdio.h>

#define MAX_VERTEX_NUM 10
void bfs_traverse(const Graph *graph) {
  int *visited[MAX_VERTEX_NUM];
  for (int i = 0; i < MAX_VERTEX_NUM; i++) {
    visited[i] = 0;
  }
  int connected_component = 0;

  for (int i = 0; i < MAX_VERTEX_NUM; i++) {
    if (!visited[i]) {
      bfs(graph, i, visited);
      connected_component++;
    }
  }
}

void bfs(const Graph *graph, int i, int *visited) {
  QueueList queue_list = init_queue();
  visited[i] = 1;
}

int main() { return 0; }