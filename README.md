# text-updates-benchmark

# To Run

Select a benchmark, build the file, boot up electron fiddle, and load the built benchmark file with the following web
preferences:

```
webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
  sandbox: false,
  backgroundThrottling: false
}
```
