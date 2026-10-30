package cn.kaoyan.assistant;
import java.util.concurrent.*;
final class WorkQueues {
 final ExecutorService local=Executors.newSingleThreadExecutor();
 final ExecutorService network=Executors.newFixedThreadPool(4);
 final ExecutorService conversion=Executors.newSingleThreadExecutor();
 final ExecutorService preview=Executors.newSingleThreadExecutor();
 final ExecutorService files=Executors.newSingleThreadExecutor();
 void close(){local.shutdownNow();network.shutdownNow();files.shutdownNow();preview.shutdownNow();conversion.shutdownNow();}
}
