cmake_minimum_required(VERSION 4.2)
project(code)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})

add_executable(code main.cpp)

file(GLOB OJ_FILES "oj/*.cpp")

foreach (file ${OJ_FILES})
    get_filename_component(name ${file} NAME_WE)
    add_executable(oj_${name} ${file})
endforeach ()
