import Request from "@/utils/request.ts"


const UserApi = {

    login(data) {
        return Request.post("/auth", data)
    },

}

export default UserApi