export const normalizeDirPath = (path: string) => {
    const value = (path || "/").trim()

    if (value === "/") return "/"

    return `/${value.replace(/^\/+|\/+$/g, "")}/`
}

export const joinDirPath = (base: string, name: string) => {
    return normalizeDirPath(`${base.replace(/\/+$/, "")}/${name}`)
}

export const joinFilePath = (base: string, name: string) => {
    return `${normalizeDirPath(base)}${name}`
}
